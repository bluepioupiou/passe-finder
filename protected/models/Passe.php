<?php

/**
 * This is the model class for table "Passe".
 *
 * The followings are the available columns in table 'Passe':
 * @property integer $id
 * @property string $name
 * @property integer $positionStart_id
 * @property integer $positionEnd_id
 * @property integer $difficulty
 * @property string $description
 * @property string $progress
 * @property string $dateCreate
 * @property string $dateMaj
 * @property integer $danse_id
 * @property integer $userCreate_id
 * @property integer $pending
 * @property integer $published
 * @property string $youtube_url
 * @property string $customName
 *
 * The followings are the available model relations:
 * @property Position $positionStart
 * @property Position $positionEnd
 * @property PersonnalizePasse[] $personnalizeNames
 * @property Danse $danse
 * @property User $userCreate
 * @property Enchainement[] $enchainements
 */
class Passe extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return Passe the static model class
	 */
	protected $name="someName";
    public function getName()
	{
		$customName = $this->name;
		$personnalize = PersonnalizePasse::model()->findByAttributes(array('user_id'=>Yii::app()->user->id,'passe_id'=>$this->id));
		if ($personnalize != null){
			$customName = $personnalize->name;
		}
		return $customName;
	}
	public function setName($name)
	{
	  $this->name=$name;
	}
	
	public function __get($name) 
	{
			$getter='get'.$name;
			if(property_exists($this,$name) && method_exists($this,$getter))
					return $this->$getter();
			else return parent::__get($name);
	}

	public function __set($name,$value) 
   { 
			$setter='set'.$name;
			if(property_exists($this,$name) && method_exists($this,$setter))
					return $this->$setter($value);
			else parent::__set($name,$value);
   }
	   
	public static function model($className=__CLASS__)
	{
		return parent::model($className);
	}

	/**
	 * @return string the associated database table name
	 */
	public function tableName()
	{
		return 'passe';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('name, positionStart_id, positionEnd_id, difficulty, description, progress, dateCreate, dateMaj, userCreate_id', 'required'),
			array('positionStart_id, positionEnd_id, difficulty, danse_id, userCreate_id', 'numerical', 'integerOnly'=>true),
			array('name', 'length', 'max'=>50),
			array('youtube_url', 'length', 'max'=>250),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('id, name, positionStart_id, positionEnd_id, difficulty, description, progress, dateCreate, dateMaj, danse_id',  'safe', 'on'=>'search'),
		);
	}

	/**
	 * @return array relational rules.
	 */
	public function relations()
	{
		// NOTE: you may need to adjust the relation name and the related
		// class name for the relations automatically generated below.
		return array(
			'positionStart' => array(self::BELONGS_TO, 'Position', 'positionStart_id'),
			'positionEnd' => array(self::BELONGS_TO, 'Position', 'positionEnd_id'),
			'userCreate' => array(self::BELONGS_TO, 'User', 'userCreate_id'),
			'enchainementPasses' => array(self::HAS_MANY, 'EnchainementPasse', 'passe_id'),
			'enchainements'=>array(self::HAS_MANY,'Enchainement',array('enchainement_id'=>'id'),'through'=>'enchainementPasses'),
			'enchainementsCount' => array(self::STAT, 'Enchainement', 'enchainement_passe(passe_id,enchainement_id)'),
			'personnalizeNames'=>array(self::HAS_MANY,'PersonnalizePasse', 'passe_id'),
			'personnalizeNamesCount' => array(self::STAT, 'PersonnalizePasse', 'passe_id'),
			'danse' => array(self::BELONGS_TO, 'Danse', 'danse_id'),
		);
	}

	/**
	 * @return array customized attribute labels (name=>label)
	 */
	public function attributeLabels()
	{
		return array(
			'id' => 'Identifiant',
			'name' => 'Nom',
			'positionStart_id' => 'Position de début',
			'positionEnd_id' => 'Position de fin',
			'difficulty' => 'Difficulté',
			'description' => 'Description rapide',
			'progress' => 'Etapes de réalisation',
			'dateCreate' => 'Création',
			'dateMaj' => 'Mise à jour',
			'danse_id' => 'Danse',
			'userCreate_id' => 'Créateur',
			'pending' => 'en attente',
			'youtube_url' => 'Numéro d\'identification Youtube'
		);
	}

	/**
	 * Retrieves a list of models based on the current search/filter conditions.
	 * @return CActiveDataProvider the data provider that can return the models based on the search/filter conditions.
	 */
	public function search()
	{
		// Warning: Please modify the following code to remove attributes that
		// should not be searched.

		$criteria=new CDbCriteria;

		$criteria->compare('id',$this->id);
		$criteria->compare('name',$this->name,true);
		$criteria->compare('positionStart_id',$this->positionStart_id);
		$criteria->compare('positionEnd_id',$this->positionEnd_id);
		$criteria->compare('difficulty',$this->difficulty);
		$criteria->compare('description',$this->description,true);
		$criteria->compare('progress',$this->progress,true);
		$criteria->compare('dateCreate',$this->dateCreate,true);
		$criteria->compare('dateMaj',$this->dateMaj,true);
		$criteria->compare('danse_id',$this->danse_id);
		
		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}