<?php

/**
 * This is the model class for table "Passe".
 *
 * The followings are the available columns in table 'Passe':
 * @property integer $id
 * @property string $name
 * @property integer $user_id
 * @property integer $passe_id
 *
 * The followings are the available model relations:
 * @property Passe $passe
 * @property User $user
 */
class PersonnalizePasse extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return Passe the static model class
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
		return 'personnalizepasse';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('name, passe_id, user_id', 'required'),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('id, name, passe_id, user_id',  'safe', 'on'=>'search'),
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
			'passe' => array(self::BELONGS_TO, 'Position', 'positionEnd_id'),
			'user' => array(self::BELONGS_TO, 'User', 'user_id'),
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
			'user_id' => 'Utilisateur',
			'passe_id' => 'Passe'
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

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}