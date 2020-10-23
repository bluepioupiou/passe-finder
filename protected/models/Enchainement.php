<?php

/**
 * This is the model class for table "Enchainement".
 *
 * The followings are the available columns in table 'Enchainement':
 * @property string $id
 * @property string $name
 * @property string $commentaire
 * @property string $dateCreate
 * @property string $dateEvent
 * @property integer $danse_id
 * @property integer $lesson_id
 * @property integer $userCreate_id
 * @property string $dateMaj
 * @property integer $published
 * @property integer $difficulty
 * @property integer $private
 * @property string $enchainementPasses_id
 *
 * The followings are the available model relations:
 * @property Danse $danse
 * @property Lesson $lesson
 * @property User $userCreate
 * @property EnchainementPasse[] $enchainementPasses
 * @property Video[] $videos
 */
class Enchainement extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return Enchainement the static model class
	 */
	public static function model($className=__CLASS__)
	{
		return parent::model($className);
	}

	/**
	 * @return string the associated database table name
	 */
	public function tableName()
	{
		return 'enchainement';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('name, commentaire, dateCreate, userCreate_id, difficulty', 'required'),
			array('danse_id, userCreate_id, lesson_id, private, published, difficulty', 'numerical', 'integerOnly'=>true),
			array('name', 'length', 'max'=>50),
			array('dateEvent','checkDateEvent'),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('id, name, commentaire, dateCreate, dateEvent, danse_id, userCreate_id, dateMaj', 'safe', 'on'=>'search'),
		);
	}
	
	public function checkDateEvent($attributes,$params){
		if($this->lesson_id){
			if(!$this->dateEvent){
				$this->addError('dateEvent','La date du cours est obligatoire');
			}
		}  
	}

	/**
	 * @return array relational rules.
	 */
	public function relations()
	{
		// NOTE: you may need to adjust the relation name and the related
		// class name for the relations automatically generated below.
		return array(
			'danse' => array(self::BELONGS_TO, 'Danse', 'danse_id'),
			'lesson' => array(self::BELONGS_TO, 'Lesson', 'lesson_id'),
			'userCreate' => array(self::BELONGS_TO, 'User', 'userCreate_id'),
			'enchainementPasses' => array(self::HAS_MANY, 'EnchainementPasse', 'enchainement_id', 'order'=>'enchainementPasses.order ASC'),
			'passes'=>array(self::HAS_MANY,'Passe',array('passe_id'=>'id'),'through'=>'enchainementPasses'),
			'passesCount' => array(self::STAT, 'Passe', 'enchainement_passe(enchainement_id, passe_id)'),
			'alternativesCount' => array(self::STAT, 'Position', 'enchainement_passe(enchainement_id, position_id)'),
			'passeDifficultyAvg' => array(self::STAT, 'Passe', 'enchainement_passe(enchainement_id, passe_id)',	'select'=> 'AVG(difficulty)'),
			'videos'=>array(self::HAS_MANY, 'Video', 'enchainement_id'),
			'videosCount'=>array(self::STAT, 'Video', 'enchainement_id'),
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
			'commentaire' => 'Commentaire',
			'dateCreate' => 'Date de création',
			'dateEvent' => 'date de l\'enchaînement',
			'danse_id' => 'Danse',
			'lesson_id'=> 'Cours',
			'userCreate_id' => 'Créateur',
			'dateMaj' => 'Date de modification',
			'passesCount' => 'Nombre de passes',
			'alternativesCount' => 'Nombre d\'alternatives',
			'userCreate' => 'Créateur',
			'published' => 'Publié',
			'private' => 'Privé',
			'difficulty' => 'Difficulté',
			'passeDifficultyAvg' => 'Difficulté des passes',
			'videosCount' => 'Nombre de vidéos'
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

		$criteria->compare('id',$this->id,true);
		$criteria->compare('name',$this->name,true);
		$criteria->compare('commentaire',$this->commentaire,true);
		$criteria->compare('dateCreate',$this->dateCreate,true);
		$criteria->compare('dateEvent',$this->dateEvent,true);
		$criteria->compare('danse_id',$this->danse_id);
		$criteria->compare('userCreate_id',$this->userCreate_id);
		$criteria->compare('dateMaj',$this->dateMaj);

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}