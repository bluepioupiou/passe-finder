<?php

/**
 * This is the model class for table "enchainement_passe".
 *
 * The followings are the available columns in table 'enchainement_passe':
 * @property integer $enchainement_id
 * @property integer $passe_id
 * @property integer $position_id
 * @property integer $order
 *
 * The followings are the available model relations:
 * @property Enchainement $enchainement
 * @property Passe $passe
 * @property Position $position
 */
class EnchainementPasse extends CActiveRecord
{
	/**
	 * Returns the static model of the specified AR class.
	 * @param string $className active record class name.
	 * @return EnchainementPasse the static model class
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
		return 'enchainement_passe';
	}

	/**
	 * @return array validation rules for model attributes.
	 */
	public function rules()
	{
		// NOTE: you should only define rules for those attributes that
		// will receive user inputs.
		return array(
			array('enchainement_id, order', 'required'),
			array('enchainement_id, passe_id, position_id, order', 'numerical', 'integerOnly'=>true),
			// The following rule is used by search().
			// Please remove those attributes that should not be searched.
			array('enchainement_id, passe_id, position_id, order', 'safe', 'on'=>'search'),
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
			'enchainement' => array(self::BELONGS_TO, 'Enchainement', 'enchainement_id'),
			'passe' => array(self::BELONGS_TO, 'Passe', 'passe_id'),
			'position' => array(self::BELONGS_TO, 'Position', 'position_id'),
		);
	}

	/**
	 * @return array customized attribute labels (name=>label)
	 */
	public function attributeLabels()
	{
		return array(
			'enchainement_id' => 'Enchainement',
			'passe_id' => 'Passe',
			'position_id' => 'Position',
			'order' => 'Order',
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

		$criteria->compare('enchainement_id',$this->enchainement_id);
		$criteria->compare('passe_id',$this->passe_id);
		$criteria->compare('position_id',$this->position_id);
		$criteria->compare('order',$this->order);

		return new CActiveDataProvider($this, array(
			'criteria'=>$criteria,
		));
	}
}